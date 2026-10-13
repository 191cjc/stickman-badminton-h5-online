package §_-2s§
{
   import bobby.§_-07§;
   import bobby.§_-0v§;
   import bobby.§_-3h§;
   import flash.display.SimpleButton;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol386")]
   public class §_-R§ extends §_-07§
   {
      
      public var §_-2G§:SimpleButton;
      
      private var §_-q§:String;
      
      public function §_-R§(param1:String)
      {
         addFrameScript(0,this.frame1);
         super();
         this.§_-q§ = param1;
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         §_-3h§.§_-3s§("backgroundmusic.mp3",0,1,2);
         §_-3h§.§_-l§(0);
         if(this.§_-q§ == "human")
         {
            gotoAndStop(1);
         }
         else if(this.§_-q§ == "robot")
         {
            gotoAndStop(2);
         }
         else if(this.§_-q§ == "multiplayer")
         {
            gotoAndStop(3);
         }
         else if(this.§_-q§ == "toaster")
         {
            gotoAndStop(4);
         }
         else if(this.§_-q§ == "demon")
         {
            gotoAndStop(5);
         }
         SimpleButton(this.§_-2G§).addEventListener(MouseEvent.MOUSE_UP,this.§if §);
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         SimpleButton(this.§_-2G§).removeEventListener(MouseEvent.MOUSE_UP,this.§if §);
      }
      
      private function §if §(param1:MouseEvent) : void
      {
         §_-0v§.§_-5q§(new §_-u§(this.§_-q§));
      }
      
      internal function frame1() : *
      {
         stop();
      }
   }
}

