package §_-0V§
{
   import §_-2s§.§_-u§;
   import bobby.§_-0v§;
   import bobby.§_-2W§;
   import bobby.§_-3e§;
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import fx.ParticleSmog;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol217")]
   public class §_-5G§ extends §_-h§
   {
      
      public var overheadSwing:Symbol30copy4;
      
      public var servePoint:MovieClip;
      
      public var underHitbox:MovieClip;
      
      public var underhandSwing:Symbol30copy5;
      
      public var §_-4M§:MovieClip;
      
      public var serveSwing:Symbol30copy6;
      
      public var computerHitbox:MovieClip;
      
      private var §_-45§:Number = 0;
      
      private var §use§:Number = 0.05;
      
      private var §_-4b§:Number = 0;
      
      public function §_-5G§()
      {
         addFrameScript(0,this.frame1);
         super();
         §case § = 0.85;
         include = 1.25;
         §do§ = 1;
         §_-4d§.push("Cheerio.");
         §_-4d§.push("Good luck old chap!");
         §_-5c§.push("Why I think I have scored!");
         §_-5c§.push("Goody.");
         §_-1H§.push("Well played old chap!");
         §_-1H§.push("Quite the shot.");
         §_-2I§.push("Good match chap!");
         §_-X§.push("Oh my.");
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         mouseEnabled = false;
         mouseChildren = false;
         MovieClip(this.§_-4M§).visible = false;
         stage.addEventListener(MouseEvent.MOUSE_DOWN,this.static);
      }
      
      override public function setupUnderhand() : void
      {
         super.setupUnderhand();
      }
      
      override public function serveBirdie() : void
      {
         super.serveBirdie();
         MovieClip(this.§_-4M§).visible = false;
      }
      
      override public function setupServe() : void
      {
         super.setupServe();
         MovieClip(this.§_-4M§).visible = true;
      }
      
      override public function humanControlHandler() : void
      {
      }
      
      private function static(param1:MouseEvent) : void
      {
         if(!§_-u§.§_-28§)
         {
            swingMe();
         }
      }
      
      private function § set§() : void
      {
         §_-2W§.§_-55§(new ParticleSmog(),§_-u§(§_-0v§.§_-b§).§_-37§,x + §_-3e§.§ else§(-5,5),y);
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         if(!§_-u§.§_-28§)
         {
            this.§_-45§ += this.§use§;
            if(this.§_-45§ > 1)
            {
               this.§_-45§ = 1;
               this.§use§ *= -1;
            }
            if(this.§_-45§ < -1)
            {
               this.§_-45§ = -1;
               this.§use§ *= -1;
            }
            if(!isNaN(root.mouseY) && root.mouseY != 5)
            {
               x -= (x - root.mouseX) / Math.pow(1.4,60 * param1);
               y -= (y - root.mouseY) / Math.pow(1.4,60 * param1) + this.§_-45§;
            }
            this.§_-4b§ = y;
            super.handleEnterFrame(param1);
         }
         else
         {
            this.§_-45§ += this.§use§ * 4;
            if(this.§_-45§ > 4)
            {
               this.§_-45§ = 4;
               this.§use§ *= -1;
            }
            if(this.§_-45§ < -4)
            {
               this.§_-45§ = -4;
               this.§use§ *= -1;
            }
            y = this.§_-4b§ + this.§_-45§;
         }
         if(§_-3e§.§_-3M§(25))
         {
            this.§ set§();
         }
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         stage.removeEventListener(MouseEvent.MOUSE_DOWN,this.static);
      }
      
      internal function frame1() : *
      {
         stop();
      }
   }
}

