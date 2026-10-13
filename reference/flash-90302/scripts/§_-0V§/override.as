package §_-0V§
{
   import §_-2g§.§var§;
   import §_-2s§.§_-u§;
   import bobby.§_-0v§;
   import bobby.§_-2W§;
   import bobby.§_-3e§;
   import bobby.§_-3h§;
   import flash.display.MovieClip;
   import flash.events.Event;
   import fx.ParticleSmog;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol178")]
   public class override extends §_-h§
   {
      
      public var overheadSwing:Symbol30copy7;
      
      public var servePoint:MovieClip;
      
      public var underHitbox:MovieClip;
      
      public var underhandSwing:Symbol30copy5;
      
      public var serveSwing:Symbol30copy9;
      
      public var computerHitbox:MovieClip;
      
      private var §_-45§:Number = 0;
      
      private var §use§:Number = 0.05;
      
      private var §_-4b§:Number = 0;
      
      public function override()
      {
         addFrameScript(0,this.frame1);
         super();
         §case § = 1;
         include = 1.15;
         §do§ = 0.96;
         §_-4d§.push("Brother!");
         §_-5c§.push("Point ahoy!");
         §_-5c§.push("Arrgh!");
         §_-1H§.push("Arrrrgh!");
         §_-1H§.push("Yarrgh!");
         §_-2I§.push("Arrgh good match!");
         §_-X§.push("Arrrrgh!");
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         this.§_-4b§ = §_-u§.§_-0o§;
      }
      
      override public function setupTrashTalk(param1:String) : void
      {
         var _loc2_:String = null;
         if(§_-u§.§_-1i§ == §_-5G§)
         {
            _loc2_ = "Brother!";
         }
         else if(§_-u§.§_-1i§ == override)
         {
            _loc2_ = "*Pop?!*";
         }
         else
         {
            _loc2_ = "*Pop*";
         }
         var _loc3_:§var§ = new §var§(_loc2_);
         §_-h§(this).addChild(_loc3_);
         _loc3_.x = -20 * §_-3e§.§_-1w§(scaleX);
         _loc3_.y = -65;
         _loc3_.scaleX *= §_-3e§.§_-1w§(scaleX);
      }
      
      override public function jumpMe() : void
      {
      }
      
      override public function serveBirdie() : void
      {
         final = false;
         §_-u§(§_-0v§.§_-b§).§_-3R§(MovieClip(this).servePoint.x * §_-3e§.§_-1w§(scaleX) + x,MovieClip(this).servePoint.y + y);
         var _loc1_:Number = 1350 * 1.1;
         var _loc2_:Number = 40 * §_-3e§.§_-1w§(scaleX);
         §_-u§.§_-3j§.§_-5z§(_loc1_,_loc2_,"nosound");
         §_-u§.§import§ = this;
         §_-3h§.§true §("toasterpop.mp3");
      }
      
      private function § set§() : void
      {
         §_-2W§.§_-55§(new ParticleSmog(),§_-u§(§_-0v§.§_-b§).§_-37§,x + §_-3e§.§ else§(-5,5),y - 60);
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
         if(§_-4l§ || !§extends§)
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
      }
      
      internal function frame1() : *
      {
         stop();
      }
   }
}

